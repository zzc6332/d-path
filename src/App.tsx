import DPath from "./d-path";

const dPath = new DPath();
const pathSeq = dPath.create([200, 200], "l", [50, 70]).add("H", 20).add("L",70,66);
const d = pathSeq.toString();
const pathSeq2 = dPath.create([200, 200], "l", [50, 180]).add("L",70,66);
const d2 = pathSeq2.toString();
dPath.connect()
console.log([...dPath.pathSet].map((item)=>item.toString()))

function App() {
  return (
    <>
      <div>{d}</div>
      <svg style={{ border: "1px solid #000" }} width="500" height="500">
        <path d={d} stroke="#000" fill="none"></path>
      </svg>
      <svg style={{ border: "1px solid #000" }} width="500" height="500">
        <path d={d2} stroke="#000" fill="none"></path>
      </svg>
      <svg style={{ border: "1px solid #000" }} width="500" height="500">
        <path d={[...dPath.pathSet].map((item)=>item.toString())[0]} stroke="#000" fill="none"></path>
      </svg>
    </>
  );
}

export default App;
