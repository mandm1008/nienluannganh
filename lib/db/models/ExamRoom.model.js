import { model, models, Schema } from 'mongoose';

const schema = new Schema({
  quizId: {
    type: String,
    required: true,
    unique: true,
  },
  containerName: {
    type: String,
    required: true,
    unique: true,
  },
  dbName: {
    type: String,
    required: true,
  },
  folderName: {
    type: String,
    required: true,
  },
  serviceUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default models['exam-rooms'] || model('exam-rooms', schema);
