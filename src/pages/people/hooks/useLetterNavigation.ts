import { useEffect, useRef, useState } from 'react';

export function useLetterNavigation(groups: Record<string, unknown[]>, searchTerm: string) {
  const letters = Object.keys(groups).sort();
  const [activeLetter, setActiveLetter] = useState('All');
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
    setActiveLetter(searchTerm.trim() ? Object.keys(groups).sort()[0] || 'All' : 'All');
  }, [groups, searchTerm]);

  const onScroll = () => {
    const list = listRef.current;
    if (!list) return;
    if (list.scrollTop === 0 && !searchTerm.trim()) {
      setActiveLetter('All');
      return;
    }
    let current = letters[0] || 'All';
    const top = list.getBoundingClientRect().top + 24;
    for (const letter of letters) {
      const section = sectionRefs.current[letter]?.querySelector<HTMLElement>('[data-person-card]');
      if (section && section.getBoundingClientRect().top <= top + 1) current = letter;
    }
    setActiveLetter(current);
  };

  const jumpToLetter = (letter: string) => {
    const list = listRef.current;
    if (!list) return;
    const section = sectionRefs.current[letter]?.querySelector<HTMLElement>('[data-person-card]');
    const top = letter === 'All' ? 0 : section
      ? list.scrollTop + section.getBoundingClientRect().top - list.getBoundingClientRect().top - 24
      : 0;
    list.scrollTo({ top });
    setActiveLetter(letter);
  };

  return { letters, activeLetter, listRef, sectionRefs, onScroll, jumpToLetter };
}
