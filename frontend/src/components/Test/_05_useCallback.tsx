import React, { useState, useCallback } from "react";

// Heavy component that receives a function as prop
const HeavyComponent: React.FC<{ getContent: () => string }> = ({ getContent }) => {
  console.log("HeavyComponent rendered");
  return <>{getContent()}</>;
};

// Memoize the component to avoid re-renders unless props change
const MemoizedHeavyComponent = React.memo(HeavyComponent);

export const E: React.FC = () => {
  const [cnt, setCnt] = useState(0);

  // useCallback ensures this function has stable reference across renders
  const getHeavyContent = useCallback(() => {
    return "Very heavy Stuff";
  }, []);

  return (
    <>
      <MemoizedHeavyComponent getContent={getHeavyContent} />
      Count = {cnt}
      <br />
      <button onClick={() => setCnt(cnt + 1)}>+</button>
    </>
  );
};


//-----------use call back works same way

// // Heavy component with expensive computation
// const HeavyComponent: React.FC = () => {
//     setTimeout(()=>{},2000)
//   console.log("Some heavy computation done to render this");
//   return <>Very heavy Stuff</>;
// };

// // Memoize it to avoid re-rendering unless props change
// const MemoizedHeavyComponent = React.memo(HeavyComponent);

// export const E: React.FC = () => {
//   const [cnt, setCnt] = useState(0);

//   return (
//     <>
//       <MemoizedHeavyComponent />
//       Count = {cnt}
//       <br />
//       <button onClick={() => setCnt(cnt + 1)}>+</button>
//     </>
//   );
// };