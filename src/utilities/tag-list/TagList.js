import './TagList.css';
import { useState } from 'react';

const TagList = () => {
    const tags = [
  "Animal / Spider Web",
  "Cleaning Screw / Staff",
  "Clouds / Shadow [Day Time]",
  "Dust Particles",
  "Flapping / Hanging Obj",
  "No Time Activity Seen",
  "Offsite Lights",
  "Person Out of Bound",
  "Plants / Tree",
  "Rain / Snow (Bad Weather)",
  "Residents",
  "Vechicle Out of Bound",
];

  const [selected, setSelected] = useState("Plants / Tree");

  return (
    <div className="tag-grid">
      {tags.map((tag, index) => (
        <button
          key={index}
          className={`tag-button ${selected === tag ? "selected" : ""}`}
          onClick={() => setSelected(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

export default TagList;