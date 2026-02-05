import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for Vite
// Note: We'll likely need to adjust this depending on the exact Vite version and setup, 
// but using the ?url import is the standard way for assets in Vite.
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ParsedTransaction {
    id: string; // Unique temp ID
    date: string;
    description: string;
    amount: number;
    balance?: number;
    category: string;
    status: 'pending' | 'reviewed';
}



import { TransactionCategory } from './transactionCategories';

const suggestCategory = (description: string, categories: TransactionCategory[]): string => {
    const upperDesc = description.toUpperCase();

    // Check dynamic categories
    for (const category of categories) {
        if (category.keywords) {
            for (const keyword of category.keywords) {
                if (upperDesc.includes(keyword.toUpperCase())) {
                    return category.name;
                }
            }
        }
    }

    return 'Uncategorized';
};

export const parseBankStatementProperties = async (file: File, categories: TransactionCategory[] = []): Promise<ParsedTransaction[]> => {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Iterate through all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Improve text extraction by respecting layout
        // Group items by Y coordinate (row)
        const items = textContent.items as any[];
        const lines: { y: number, text: string }[] = [];

        // Simple grouping with tolerance for Y position
        const TOLERANCE = 5;

        items.forEach(item => {
            const y = item.transform[5]; // Y coordinate is usually index 5 in transform matrix
            const text = item.str;

            if (!text.trim()) return;

            const existingLine = lines.find(line => Math.abs(line.y - y) < TOLERANCE);
            if (existingLine) {
                existingLine.text += ' ' + text;
            } else {
                lines.push({ y, text });
            }
        });

        // Sort lines by Y descending (top to bottom)
        lines.sort((a, b) => b.y - a.y);

        fullText += lines.map(l => l.text).join('\n') + '\n';
    }

    console.log("Raw PDF Text:", fullText); // Debugging aid

    return parseTextToTransactions(fullText, categories);
};

const parseTextToTransactions = (text: string, categories: TransactionCategory[]): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n');

    // Regex Logic based on user image:
    // 10/23 Card Purchase ... -21.83 865.10
    // Date: (\d{1,2}\/\d{1,2})
    // Description: (.*?)
    // Amount: (-?[\d,]+\.\d{2})
    // Balance: (-?[\d,]+\.\d{2})

    // Note: The description might contain dates too, but usually the first date is the transaction date.
    // We look for lines that START with a date and END with two monetary values (Amount, Balance)
    // or at least one monetary value if Balance isn't grabbed correctly.

    const lineRegex = /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})$/;

    lines.forEach((line, index) => {
        const match = line.trim().match(lineRegex);
        if (match) {
            const [_, dateStr, desc, amountStr, balanceStr] = match;

            // Cleanup amount (remove commas)
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            const balance = parseFloat(balanceStr.replace(/,/g, ''));

            transactions.push({
                id: `id-${Date.now()}-${index}`,
                date: dateStr,
                description: desc.trim(),
                amount: amount,
                balance: balance,
                category: suggestCategory(desc, categories),
                status: 'pending'
            });
        }
    });

    return transactions;
};
