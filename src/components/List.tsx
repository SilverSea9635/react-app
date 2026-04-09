import { useState } from 'react';
function List() {
  const [items, setItems] = useState<number[]>([1,2,3]);
  return (
  <>
    {items.map((item, index) => (
      index % 2 === 1 ? <div key={item}>{item}</div> : null
    ))}
    <button onClick={() => setItems((prevItems) => [...prevItems, items.length + 1])}>追加</button>
  </>
  );
}

export default List;
