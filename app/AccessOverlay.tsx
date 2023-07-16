import React, { useState, useEffect } from 'react';

const AccessOverlay = ({ children }) => {
  const [password, setPassword] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    if (password === "admin") {
      setAccessGranted(true);
    } else {
      alert("Wrong password. Please try again.");
      setPassword("");
    }
  };

  if (!isClient) {
    // If we're not on the client, don't render anything
    return null;
  } else if (accessGranted) {
    return children;
  } else {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <form onSubmit={handlePasswordSubmit}>
          <input type="password" value={password} onChange={handlePasswordChange} placeholder="Enter password" />
          <button type="submit">Submit</button>
        </form>
      </div>
    );
  }
};

export default AccessOverlay;
