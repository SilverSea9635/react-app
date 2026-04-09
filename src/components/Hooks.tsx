import { useState } from 'react';

function Hooks() {
  const [count, setCount] = useState(0);
  return (
  <>
    <p>点击了{count}次</p>
    <button onClick={() => setCount(prevCount => prevCount + 1)}>点击</button>
  </>
  );
}

export default Hooks;
