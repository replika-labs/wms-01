'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [home, setHome] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const healthRes = await axios.get('http://localhost:8080/api/health');
        setHealth(healthRes.data);

        const homeRes = await axios.get('http://localhost:8080/api/home');
        setHome(homeRes.data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1>WMS Dashboard</h1>
      <div>
        <h2>Server Health</h2>
        <pre>{health ? JSON.stringify(health, null, 2) : 'Loading...'}</pre>
      </div>
      <div>
        <h2>Home Message</h2>
        <pre>{home ? JSON.stringify(home, null, 2) : 'Loading...'}</pre>
        </div>
    </div>
  );
}
