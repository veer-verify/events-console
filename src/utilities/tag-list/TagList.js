import './TagList.css';
import { useState } from 'react';

const TagList = ({ actionTags, item, tagIndex, handleEvent, handleTags }) => {
  // const tags = [
  //   "Animal / Spider Web",
  //   "Cleaning Screw / Staff",
  //   "Clouds / Shadow [Day Time]",
  //   "Dust Particles",
  //   "Flapping / Hanging Obj",
  //   "No Time Activity Seen",
  //   "Offsite Lights",
  //   "Person Out of Bound",
  //   "Plants / Tree",
  //   "Rain / Snow (Bad Weather)",
  //   "Residents",
  //   "Vechicle Out of Bound",
  // ];

  // const [selected, setSelected] = useState("Plants / Tree");

  return (
    <div className="tag-grid">
      {actionTags.map((tag, index) => (
        <button
          className='tag-button'
          key={index}
          onClick={() => {handleEvent(item, tagIndex); handleTags()}}
        >
          {tag.subCategoryName}
        </button>
      ))}
    </div>
  );
}

export default TagList;