import mongoose from "mongoose";

async function connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connect DB success!!!");
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
}

function handleError(error) {
  console.log(error);
}

export { connect };
