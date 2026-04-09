import { useState } from 'react';

export const BasicState = () => {
  const [info, setInfo] = useState({
    name: 'CodeGod',
    age: 0,
  });
  const handleClick = () => {
    setInfo(prevState => ({
      ...prevState,
      age: prevState.age + 1,
    }));
  }
  return (
    <>
      <div>
        <h1>{info.name}</h1>
        <p>{info.age}</p>
        <button onClick={handleClick}>点击</button>
      </div>
    </>
  )
}
