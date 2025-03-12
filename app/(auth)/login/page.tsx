'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Page() {
  const router = useRouter();
  const [chatId, setChatId] = useState(null);

  useEffect(() => {
    async function fetchChat() {
      try {
        const res = await fetch('/api/get-latest-chat'); // Create this API route
        const data = await res.json();
        if (data?.chatId) {
          setChatId(data.chatId);
        }
      } catch (error) {
        console.error('Error fetching latest chat:', error);
      }
    }
    fetchChat();
  }, []);

  const handleClick = () => {
    if (chatId) {
      router.push(`/chat/${chatId}`);
    } else {
      router.push('/chat'); // Go to a page where a new chat gets created
    }
  };

  return (
    <div 
      className="flex flex-col h-screen w-screen items-center justify-center bg-background cursor-pointer"
      onClick={handleClick}
    >
      <h1 className="text-3xl font-semibold dark:text-zinc-50">
        Welcome to Bultum Academy GPT
      </h1>
      <p className="text-lg text-gray-500 dark:text-zinc-400 mt-2">
        Click anywhere to start
      </p>
    </div>
  );
}
