import { model, models, Schema } from 'mongoose';

/**
 * @typedef {Object} ExamRoom
 * @property {number} quizId
 * @property {string} containerName
 * @property {string} dbName
 * @property {string} folderName
 * @property {string} [serviceUrl]
 * @property {string} [fileBackupId]
 * @property {string} [fileUsersId]
 * @property {string} [token]
 * @property {string} [containerCourseId]
 * @property {number} [status]
 * @property {number} [error]
 * @property {Date} createdAt
 */

/** @type {import('mongoose').Schema<ExamRoom>} */
const schema = new Schema({
  quizId: {
    type: Number,
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
  fileBackupId: String,
  fileUsersId: String,
  token: String,
  containerCourseId: String,
  status: Number,
  error: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/** @type {import('mongoose').Model<ExamRoom>} */
const ExamRoomModel = models['exam-rooms'] || model('exam-rooms', schema);

export default ExamRoomModel;
