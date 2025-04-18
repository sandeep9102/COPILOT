import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Menu, X, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

function App() {
  const [histories, setHistories] = useState([]);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(localStorage.getItem("sessionId"));
  const [chatHistory, setChatHistory] = useState([]);
  const chatRef = useRef(null);

  useEffect(() => {
    const storedHistories = JSON.parse(localStorage.getItem("chatHistories")) || [];
    setHistories(storedHistories);

    if (!sessionId) {
      startNewSession();
    } else {
      fetchChatHistory(sessionId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatHistories", JSON.stringify(histories));
  }, [histories]);

  useEffect(() => {
    if (sessionId) {
      fetchChatHistory(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const startNewSession = async () => {
    try {
      const response = await fetch("http://localhost:5000/chat/start", { method: "POST" });
      const data = await response.json();
      setSessionId(data.session_id);
      localStorage.setItem("sessionId", data.session_id);
      const newHistories = [...histories, { sessionId: data.session_id, title: "" }];
      setHistories(newHistories);
      setChatHistory([]);
    } catch (error) {
      console.error("Error starting new session:", error);
    }
  };

  const fetchChatHistory = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/chat/history/${id}`);
      const data = await response.json();
      setChatHistory(data.chat_history || []);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  const handleSessionChange = (id) => {
    setSessionId(id);
    localStorage.setItem("sessionId", id);
    fetchChatHistory(id);
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const newMessage = { query: input, response: "..." };
    setChatHistory((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input, session_id: sessionId }),
      });

      const data = await response.json();
      const botMessage = { query: input, response: data.response };
      setChatHistory((prev) => [...prev.slice(0, prev.length - 1), botMessage]);

      setHistories((prev) => {
        return prev.map((h) =>
          h.sessionId === sessionId && !h.title
            ? { ...h, title: input }
            : h
        );
      });
    } catch (error) {
      console.error("Error fetching response:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0A1021]">
      <div className={`${isSidebarOpen ? "w-64" : "w-0"} bg-[#0F172A] border-r border-[#1E293B] transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-[#1E293B]">
          <button onClick={startNewSession} className="w-full bg-[#3B82F6] text-white rounded-lg py-2 flex items-center justify-center gap-2 hover:bg-[#2563EB]">
            <MessageSquare size={18} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {histories.map((history, index) => (
            <button key={index} onClick={() => handleSessionChange(history.sessionId)} className={`w-full text-left p-3 hover:bg-[#1E293B] ${sessionId === history.sessionId ? "bg-[#2563EB]" : ""}`}>
              <div className="font-medium text-white truncate">{history.title || `Chat ${index + 1}`}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-[#0F172A] border-b border-[#1E293B] p-4 flex items-center">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[#1E293B] rounded-lg text-white">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="ml-4 text-xl font-semibold text-white">Saarthi Copilot</h1>
        </div>

        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 bg-[#0A1021]">
          {chatHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-[#3B82F6] animate-pulse mb-2">🤖 Welcome to Saarthi Copilot!</h2>
                <p className="text-white text-lg">How may I assist you today?</p>
              </div>
            </div>
          ) : (
            chatHistory.map((message, index) => (
              <React.Fragment key={index}>
                <div className="p-4 rounded-lg bg-[#1E293B] mb-2 flex gap-2 items-start">
                  <User size={20} className="text-[#3B82F6] mt-1" />
                  <div className="text-white">{message.query}</div>
                </div>
                <div className="p-4 rounded-lg bg-[#0F172A] mb-4 flex gap-2 items-start text-white">
                  <Bot size={20} className="text-green-400 mt-1" />
                  <div>
                    <ReactMarkdown
                      components={{
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                      }}
                    >
                      {message.response}
                    </ReactMarkdown>
                  </div>
                </div>
              </React.Fragment>
            ))
          )}
        </div>

        <div className="bg-[#0F172A] border-t border-[#1E293B] p-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
              className="flex-1 bg-[#1E293B] text-white px-4 py-2 rounded-lg"
            />
            <button onClick={handleSend} className="bg-[#3B82F6] text-white px-4 py-2 rounded-lg">
              {loading ? "Loading..." : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
