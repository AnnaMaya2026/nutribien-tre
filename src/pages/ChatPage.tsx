import { useState, useRef, useEffect } from "react";
import { getAIResponse, AI_RESPONSES } from "@/lib/mockData";
import { Send, Bot, User } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Message {
  id: number;
  text: string;
  from: "user" | "ai";
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: AI_RESPONSES.default, from: "ai" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), text: input, from: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate AI delay
    setTimeout(() => {
      const aiMsg: Message = { id: Date.now() + 1, text: getAIResponse(input), from: "ai" };
      setMessages((prev) => [...prev, aiMsg]);
    }, 800);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 border-b border-border">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Bot className="w-5 h-5" /> Nutritionniste IA
        </h1>
        <p className="text-xs text-muted-foreground">Conseils personnalisés pour la ménopause</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.from === "user" ? "justify-end" : ""} animate-fade-in`}>
            {msg.from === "ai" && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.from === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card text-card-foreground rounded-bl-md card-soft"
              }`}
            >
              {msg.text}
            </div>
            {msg.from === "user" && (
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-background border-t border-border">
        <div className="flex gap-2 pt-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Posez votre question..."
            className="h-11 bg-card rounded-lg flex-1"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
