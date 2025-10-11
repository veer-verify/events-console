import { get, set } from '../../services/StorageService';
import './TagList.css';

const TagList = ({ actionTags, handleEvent, closeTags, index, currentEvent }) => {
  const type = get('id');

  return (
    <div className="tag-grid">
      {actionTags.map((tag, i) => (
        <button
          key={i}
          className='tag-button'
          style={{border: type === 1 ? '1px solid #53BF8B' : '1px solid #ED3237'}}
          onClick={() => { set('eventTag', tag.subCategoryName); handleEvent(currentEvent, index); closeTags() }}
        >
          {tag.subCategoryName}
        </button>
      ))}
    </div>
  );
}

export default TagList;