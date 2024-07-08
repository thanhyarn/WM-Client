import React from "react";

const Modal = ({ isVisible, content, onClose }) => {
  console.log(content);
  if (!isVisible) return null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>
          &times;
        </span>
        {content}
      </div>
    </div>
  );
};

export default Modal;
