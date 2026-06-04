import { IncomingForm } from 'formidable';
import { NextApiRequest } from 'next';

export async function parseFormData(req: NextApiRequest) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFields: 10,
      maxFieldsSize: 1024 * 1024, // 1MB
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}
