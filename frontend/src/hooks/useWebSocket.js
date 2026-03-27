import { useEffect, useRef, useState, useCallback } from "react";

const getWsUrl = () => {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${host}/ws`;
};

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState({
    houses: [],
    listings: [],
    trades: [],
  });
  const [lastEvent, setLastEvent] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    // Prevent multiple concurrent sockets (StrictMode/dev remounts)
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING) return;

    const url = getWsUrl();
    const socket = new WebSocket(url);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => {
      setConnected(false);
      socketRef.current = null;
      if (!shouldReconnectRef.current) return;
      reconnectTimerRef.current = setTimeout(connect, 1500);
    };
    socket.onerror = () => socket.close();

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setLastEvent(msg);

        switch (msg.type) {
          case "INIT":
            setData((d) => ({ ...d, ...msg.payload }));
            break;
          case "ENERGY_UPDATE":
            setData((d) => ({ ...d, houses: msg.payload.houses || d.houses }));
            break;
          case "LISTINGS_UPDATE":
            setData((d) => ({ ...d, listings: msg.payload.listings || d.listings }));
            break;
          case "TRADES_UPDATE":
            setData((d) => ({ ...d, trades: msg.payload.trades || d.trades }));
            break;
          default:
            break;
        }
      } catch (_) {}
    };

    socketRef.current = socket;
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      setConnected(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      if (socketRef.current) socketRef.current.close();
      socketRef.current = null;
    };
  }, [connect]);

  return { ...data, connected, lastEvent };
}
