import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();

export const sendMessageNotification = functions.firestore
  .document('users/{userId}/notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;

    // Get the user's FCM token
    const tokenDoc = await admin.firestore().doc(`userTokens/${userId}`).get();
    const token = tokenDoc.data()?.token;
    if (!token) return;

    const payload = {
      notification: {
        title: 'New Message',
        body: 'You have a new message!',
      }
    };

    await admin.messaging().sendToDevice(token, payload);
  });