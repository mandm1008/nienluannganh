import { model, models, Schema } from 'mongoose';

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

export default models['files'] || model('files', schema);
