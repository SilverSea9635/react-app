import { useState, useEffect } from "react";

interface HelloWorldProps {
  title?: string,
  render?: () => React.ReactNode,
  onChange?: (count: any) => void
}

export const HelloWorld = (props: HelloWorldProps) => {
  const { title, render, onChange } = props;
  const [ count, setCount ] = useState(0);
  const handleClick = () => {
    console.log("click");
    setCount(count + 1);
  }
  useEffect(() => {
    onChange?.(count);
  }, [ count ]);
  return (
    <div>
      <h1>Hello World {title}</h1>
      <button onClick={handleClick}>点击</button>
      <p>点击了{count}次</p>
      {render?.()}
    </div>
  )
}