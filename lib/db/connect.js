import mongoose from "mongoose";

async function connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connect DB success!!!");
  } catch (error) {
    handleError(error);
  }
}

function handleError(error) {
  console.log(error);
}

export { connect };
