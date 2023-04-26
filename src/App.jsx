import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { useQuery } from "react-query";

async function getData() {
  const response = await fetch("/api/people");
  const json = await response.json();
  return json;
}

function Person({ person }) {
  return `${person.name} is ${person.age} years old`;
}

function PeopleList() {
  const query = useQuery({
    // Needs to be the same key, obviously.
    queryKey: ["data"],
    queryFn: getData,
    // Reload data every 3 seconds.
    refetchInterval: 3 * 1000,
  });

  if (query.status === "loading") {
    return (
      <ul>
        <li>Loading...</li>
      </ul>
    );
  }
  if (query.status === "error") {
    return (
      <ul>
        <li>Error</li>
      </ul>
    );
  }

  return (
    <ul>
      {query.data.map((person) => {
        return (
          <li key={person.name}>
            <Person person={person} />
          </li>
        );
      })}
    </ul>
  );
}

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <PeopleList />
    </>
  );
}

export default App;
