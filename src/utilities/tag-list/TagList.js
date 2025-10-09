import { get } from '../../services/StorageService';
import './TagList.css';

const TagList = ({ actionTags, handleEvent, closeTags, index, currentEvent }) => {
  const type = get('id');

  return (
    <div className="tag-grid">
      {actionTags.map((tag, i) => (
        <button
          className='tag-button'
          style={{border: type === 1 ? '1px solid #53BF8B' : '1px solid #ED3237'}}
          key={i}
          onClick={() => {handleEvent(currentEvent, index); closeTags()}}
        >
          {tag.subCategoryName}
        </button>
      ))}
    </div>
  );
}

export default TagList;