"use client";

import Link from "next/link";

import { Search } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-screen bg-[#1A1D1E] text-white">
      <aside className="hidden w-[260px] flex-none border-r border-[#323234] bg-[#1A1D1E] p-2 md:block">
        <div className="mb-2 flex items-center gap-2 rounded-md border border-[#323234] bg-[#262627] px-2.5 py-2 text-[13px] text-[#9AA0A6]">
          <Search className="h-4 w-4" strokeWidth={1.75} />
          Search chats...
        </div>
        <button className="mb-4 w-full rounded-md bg-[#3E63DD] px-3 py-2 text-[13px] font-medium text-white">
          + New chat
        </button>
        <div className="px-2 text-[11px] uppercase text-[#9AA0A6]">Today</div>
        <div className="mt-1 rounded-md bg-[#2B2F31] px-2.5 py-2 text-[13px]">
          Master build setup
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-[720px] text-center">
            <h1 className="text-2xl font-medium">Hi Maksym!</h1>
            <p className="mt-2 text-sm text-[#9AA0A6]">
              What can I help you get done?
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {[
                "What should I work on next?",
                "Plan my week",
                "Reschedule my day",
                "Summarize my day",
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-md border border-[#323234] bg-[#262627] px-4 py-3 text-left text-sm hover:bg-[#2B2F31]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-[#323234] p-3">
          <div className="mx-auto flex max-w-[760px] items-center gap-2 rounded-md border border-[#323234] bg-[#262627] p-2">
            <input
              disabled
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#9AA0A6]"
              placeholder="Ask anything about your tasks and calendar..."
            />
            <Link
              href="/settings"
              className="rounded-md bg-[#3E63DD] px-3 py-1.5 text-[13px] font-medium text-white"
            >
              Add key
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
