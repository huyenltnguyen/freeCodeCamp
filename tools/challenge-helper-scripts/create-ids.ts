import ObjectID from 'bson-objectid';

const createIds = () => {
  const count = 100;

  for (let i = 0; i <= count; i++) {
    const id = new ObjectID();
    console.log('🚀 ~ createIds ~ id:', id);
  }
};

createIds();
