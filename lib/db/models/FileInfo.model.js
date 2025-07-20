import { model, models, Schema } from 'mongoose';

/**
 * @typedef {Object} FileDoc
 * @property {string} fileName
 * @property {string} contentHash
 * @property {string} url
 */

/** @type {import('mongoose').Schema<FileDoc>} */
const schema = new Schema({
  fileName: {
    type: String,
    required: true,
  },
  contentHash: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
});

/** @type {import('mongoose').Model<FileDoc>} */
const FileModel = models['files'] || model('files', schema);

export default FileModel;
