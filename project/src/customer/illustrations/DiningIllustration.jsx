import React from 'react';
import dining from '../../images/people-dining.png';


const DiningIllustration = () => {
  return (
    <img
      src={dining}
      alt="People Dining"
      className="w-80 h-60 object-contain rounded-3xl shadow-xl"
    />
  );
};

export default DiningIllustration;
