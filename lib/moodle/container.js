import { backupCourse, exportUsers } from '@/lib/moodle/backup';
import FileInfoModel from '@/lib/db/models/FileInfo.model';
import ExamRoomModel from '@/lib/db/models/ExamRoom.model';
import { uploadFile, restoreCourse, restoreUsers } from '@/lib/moodle/restore';

/**
 * Initializes a Moodle container by:
 * 1. Fetching a token from the container.
 * 2. Backing up the course and exporting users from the original system.
 * 3. Saving backup metadata to the database.
 * 4. Uploading backup files to the container.
 * 5. Restoring the course and users inside the container.
 *
 * @async
 * @function initContainer
 * @param {string} containerName - The container name (must match an ExamRoomModel document).
 * @returns {Promise<{ success: boolean, error?: string }>} Deployment result.
 *
 * @example
 * const result = await initContainer('quiz-container-123');
 * if (!result.success) console.error(result.error);
 */
export async function initContainer(containerName) {
  const room = await ExamRoomModel.findOne({ containerName });

  if (!room) {
    const msg = `❌ Room not found for container: ${containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  // B1: Get Token CloudSupport
  await getTokenContainer(room);

  if (!room.token) {
    const msg = `❌ Token not retrieved for room: ${containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  // B2: Get File Backup & UserData
  const quizData = await getQuizById(room.quizId);
  const courseId = quizData.courseid;

  const fileCourseData = await backupCourse(courseId);
  const fileUserData = await exportUsers(courseId);

  // B3: Save data
  const fileCourse = new FileInfoModel({
    fileName: fileCourseData.filename,
    contentHash: fileCourseData.contenthash,
    url: fileCourseData.url,
  });
  await fileCourse.save();

  const fileUsers = new FileInfoModel({
    fileName: fileUserData.filename,
    contentHash: fileUserData.contenthash,
    url: fileUserData.url,
  });
  await fileUsers.save();

  room.fileBackupId = fileCourse._id;
  room.fileUsersId = fileUsers._id;
  await room.save();

  // B4: Upload Data
  const resCourseUpFile = await uploadFile(fileCourse.fileName, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });

  if (!resCourseUpFile.success) {
    const msg = `❌ Failed to upload course file - ${room.containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  const resUsersUpFile = await uploadFile(fileUsers.fileName, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });

  if (!resUsersUpFile.success) {
    const msg = `❌ Failed to upload user file - ${room.containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  // B5: Import data in container
  const restoreCourseStatus = await restoreCourse(courseId, fileCourse.fileName, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });

  if (!restoreCourseStatus.success) {
    const msg = `❌ Failed to restore course in container - ${room.containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  const restoreUsersStatus = await restoreUsers(fileUsers.fileName, {
    baseUrl: room.serviceUrl,
    token: room.token,
  });

  if (!restoreUsersStatus.success) {
    const msg = `❌ Failed to import users in container - ${room.containerName}`;
    console.error(msg);
    return { success: false, error: msg };
  }

  console.log(`✅ Container ${room.containerName} initialized successfully.`);
  return { success: true };
}

/**
 * Retrieves a Moodle token from the deployed container and saves it to the given ExamRoomModel document.
 *
 * This function sends a POST request to the service's `create_token.php` endpoint using the main Moodle token.
 * If the request is successful, it stores the new token in `room.token` and saves the document.
 * If the request fails and retry count (`count`) is less than 3, it retries using `initContainer()`.
 *
 * @async
 * @function getTokenContainer
 * @param {import('@/lib/db/models/ExamRoom.model').default} room - An instance of ExamRoomModel, representing the exam container.
 * @param {number} [count=0] - The number of retry attempts made so far.
 * @returns {Promise<ExamRoomModel>} The updated room document, possibly with the `token` field updated.
 *
 * @example
 * const room = await ExamRoomModel.findById('...');
 * const updatedRoom = await getTokenContainer(room);
 * console.log(updatedRoom.token);
 */
async function getTokenContainer(room, count = 0) {
  const moodleToken = process.env.MOODLE_CLOUDSUPPORT_TOKEN;
  const moodleBaseUrl = room.serviceUrl;
  const apiUrl = `${moodleBaseUrl}/local/cloudsupport/create_token.php`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      main_token: moodleToken,
    }),
  });

  console.log(response);

  if (response.ok) {
    const data = await response.json(); // ✅ Fix: parse response body
    room.token = data.token;
    await room.save();
    return room;
  } else if (count < 3) {
    console.log(`Failed! Get Token (${room.serviceUrl}) - ${count + 1}`);
    return await initContainer(room, count + 1);
  }

  return room;
}

export { initContainer };
