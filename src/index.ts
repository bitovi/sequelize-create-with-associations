export const extendSequelize = async (SequelizeClass: any) => {
  const originalFindOne = SequelizeClass.Model.findOne;

  SequelizeClass.Model.findOne = function (...args) {
    return originalFindOne.apply(this, [...args]);
  };
};
