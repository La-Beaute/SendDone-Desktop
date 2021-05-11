import React, { useState, useEffect } from 'react';
import './ItemView.css';


/**
 * 
 * @param {{items:Array.<{path:string, dir: string, name:string, type:'file'|'directory'}>, curDir:string, setCurDir:function, checkedItems:{}, setCheckedItems:function}} items 
 * @returns 
 */
function ItemView({ items, curDir, setCurDir, checkedItems, setCheckedItems }) {
  let [checkAll, setCheckAll] = useState(false);

  const showItems = () => {
    let ret = [];
    for (let itemName in items) {
      let item = items[itemName];
      if (item.type === 'directory') {
        ret.push(
          <div className='ItemElement' key={item.dir + item.name}>
            <div className='ItemName'>
              📁 | {item.name}
            </div>
            <div>
              <input type='checkbox' checked={(item.name in checkedItems) || checkAll}
                onChange={(e) => { handleItemCheck(e.target.checked, item.name); }} />
            </div>
          </div>
        );
      }
      else {
        ret.push(
          <div className='ItemElement' key={item.dir + item.name}>
            <div className='ItemName'>
              File | {item.name}
            </div>
            <div>
              <input type='checkbox' checked={(item.name in checkedItems) || checkAll}
                onChange={(e) => { handleItemCheck(e.target.checked, item.name); }} />
            </div>
          </div>
        );
      }
    }
    return ret;
  }

  const handleItemCheck = (checked, name) => {
    if (checked) {
      setCheckedItems(checkedItems => ({ ...checkedItems, [name]: true }));
    }
    else {
      setCheckedItems(checkedItems => {
        const tmp = { ...checkedItems };
        delete tmp[name];
        return tmp;
      });
      setCheckAll(false);
    }
  }

  // const showCurDir = () => {
  //   let ret = [<button key='Home' onClick={goHome}>Home</button>];
  //   if (curDir.startsWith('.'))
  //     return ret;
  //   let dirArray = curDir.split(window.path.sep);
  //   let cumulativeDir = '';
  //   for (let i = 0; i < dirArray.length; ++i) {
  //     ret.push('>');
  //     cumulativeDir = window.path.join(cumulativeDir, dirArray[i]);
  //     let tmp = cumulativeDir;
  //     ret.push(<button key={tmp} onClick={() => { setCurDir(tmp); }}>{dirArray[i]}</button>);
  //   }
  //   return ret;
  // }

  // const goHome = () => {
  //   setCurDir('.');
  // }

  useEffect(() => {
    let numCheckedItems = Object.keys(checkedItems).length;
    let numItems = Object.keys(items).length;
    if (numItems > 0 && numCheckedItems === numItems)
      setCheckAll(true);
    else
      setCheckAll(false);
  }, [checkAll, items, checkedItems]);

  return (
    <div className='ItemView'>
      <div className='ItemViewTable'>
        <div className='ItemElement ItemHead'>
          <div className='ItemName'>
            {/* {showCurDir()} */}
          </div>
          <div>
            <input type='checkbox' checked={checkAll} onChange={(e) => {
              if (e.target.checked) {
                setCheckedItems(checkedItems => {
                  return { ...items };
                });
                setCheckAll(true);
              }
              else {
                // Uncheck all.
                setCheckedItems({});
                setCheckAll(false);
              }
            }}>
            </input>
          </div>
        </div>
        {showItems()}
      </div>
    </div >
  )
}

export default ItemView;