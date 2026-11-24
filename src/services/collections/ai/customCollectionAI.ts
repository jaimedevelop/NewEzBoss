const inventoryKinds = ['products', 'labor', 'tools', 'equipment'] as const;
type InventoryKind = typeof inventoryKinds[number];
export type CollectionAIInventory = Record<InventoryKind, { id: number; name: string; description: string | null }[]>;

export function customChatEndpoint(value: string): string {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.href.length > 2000) {
        throw new Error('Enter an HTTPS URL without credentials, a query, or a fragment.');
    }
    url.pathname = url.pathname.replace(/\/+$/, '');
    if (!/\/chat\/completions$/i.test(url.pathname)) {
        url.pathname = url.pathname === '/' ? '/chat/completions' : `${url.pathname}/chat/completions`;
    }
    return url.href;
}

function requestProvider(endpoint: string, key: string, body: unknown, signal: AbortSignal): Promise<string> {
    signal.throwIfAborted();
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'Custom AI provider connection';
    frame.sandbox.add('allow-scripts');
    frame.referrerPolicy = 'no-referrer';
    const url = new URL(`${import.meta.env.VITE_API_URL}/native-collection-ai/provider-frame`, location.origin);
    url.hash = new URLSearchParams({ parent: location.origin }).toString();
    frame.src = url.href;

    return new Promise((resolve, reject) => {
        let port: MessagePort | undefined;
        const finish = (error?: unknown, result?: string) => {
            window.clearTimeout(timer);
            window.removeEventListener('message', connect);
            signal.removeEventListener('abort', abort);
            port?.close();
            frame.remove();
            if (error) reject(error);
            else resolve(result!);
        };
        const abort = () => finish(signal.reason);
        const connect = (event: MessageEvent) => {
            if (event.source !== frame.contentWindow || event.origin !== 'null' ||
                event.data !== 'ezboss-collection-ai-ready' || !event.ports[0] || port) return;
            port = event.ports[0];
            window.clearTimeout(timer);
            timer = window.setTimeout(() => finish(new Error('The custom provider did not respond in time.')), 50000);
            port.onmessage = ({ data }) => {
                if (typeof data?.text === 'string') finish(undefined, data.text);
                else finish(new Error(typeof data?.error === 'string' ? data.error : 'The custom provider returned an invalid response.'));
            };
            port.postMessage({ endpoint, key, body });
        };
        let timer = window.setTimeout(() => finish(new Error('Could not start the browser connection for custom AI providers.')), 10000);
        window.addEventListener('message', connect);
        signal.addEventListener('abort', abort, { once: true });
        document.body.append(frame);
    });
}

export async function generateCustomCollection(endpoint: string, key: string, model: string, prompt: string, inventory: CollectionAIInventory, signal: AbortSignal) {
    const instruction = "Build a construction estimate collection for the requested work. Select only directly relevant inventory and standard supporting items. Omit items that depend on unspecified work or site conditions. Use supplied inventory IDs of the matching contentType. Return only JSON with name, description, and items. Each item has contentType (products/labor/tools/equipment), itemId (integer), and quantity (positive integer). An empty items array is valid.";
    const text = await requestProvider(endpoint, key, {
        model, max_tokens: 3000,
        messages: [
            { role: 'system', content: instruction },
            { role: 'user', content: JSON.stringify({ request: prompt, inventory }) },
        ],
    }, signal);
    const invalid = () => new Error('The custom provider returned an invalid collection. Try a smaller request or check the model.');
    let proposal;
    try {
        proposal = JSON.parse(text.trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/, ''));
    } catch {
        throw invalid();
    }
    const { name, description, items } = proposal ?? {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 200 ||
        typeof description !== 'string' || description.length > 5000 || !Array.isArray(items) || items.length > 200) throw invalid();

    const seen = new Set<string>();
    const preview = items.map(item => {
        const { contentType, itemId, quantity } = item ?? {};
        if (!inventoryKinds.includes(contentType) || !Number.isInteger(itemId) || itemId <= 0 ||
            !Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) throw invalid();
        const row = inventory[contentType as InventoryKind].find(entry => entry.id === itemId);
        const id = `${contentType}:${itemId}`;
        if (!row || seen.has(id)) throw invalid();
        seen.add(id);
        return { contentType: contentType as InventoryKind, itemId: itemId as number, quantity: quantity as number, name: row.name };
    });
    return {
        collection: { name: name.trim(), description, items: preview.map(({ contentType, itemId, quantity }) => ({ contentType, itemId, quantity })) },
        preview,
    };
}
