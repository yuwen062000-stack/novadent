import { useEffect } from "react";

function App() {
  useEffect(() => {
    window.location.href = "/";
  }, []);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif"
    }}>
      <p>正在前往 Novadent 平台...</p>
    </div>
  );
}

export default App;
