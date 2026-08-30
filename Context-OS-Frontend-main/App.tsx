import { useState } from 'react';
import Landing from './Landing';
import Workspace from './Workspace';

export default function App() {
  const [username, setUsername] = useState('');
  const [isEntered, setIsEntered] = useState(false);

  if (isEntered && username.trim()) {
    return <Workspace username={username.trim()} />;
  }

  return (
    <Landing 
      onEnter={(name) => {
        setUsername(name);
        setIsEntered(true);
      }} 
    />
  );
}