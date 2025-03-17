import { model, models, Schema } from 'mongoose';

const schema = new Schema({
  quizId: {
    type: String,
    required: true,
  },
  containerName: {
    type: String,
    required: true,
  },
  dbName: {
    type: String,
    required: true,
  },
  folderName: {
    type: String,
    required: true,
  },
  serviceUrl: {
    type: String,
    required: true,
  },
  timeOpen: String,
  timeClose: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default models.ExamRoom || model('ExamRoom', schema);
