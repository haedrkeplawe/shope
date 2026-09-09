import React, { useEffect, useRef, useState } from "react";
import { FiMoreVertical } from "react-icons/fi";

/*
  ActionsDropdown
  - قائمة إجراءات منسدلة عامة (3 نقاط)، بتتقفل لو ضغطت بره منها
  - actions: [{ label, icon, onClick, danger? }]
*/
const ActionsDropdown = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="actions-dropdown" ref={ref}>
      <button
        type="button"
        className="actions-dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        <FiMoreVertical />
      </button>

      {open && (
        <div className="actions-dropdown-menu">
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              className={`actions-dropdown-item ${
                action.danger ? "actions-dropdown-item--danger" : ""
              }`}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionsDropdown;
