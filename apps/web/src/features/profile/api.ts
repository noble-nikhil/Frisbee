import { updateDoc } from 'firebase/firestore'
import { tokenize, type AvailabilityStepInput, type BasicsInput, type TagsInput, type User } from '@frisbee/shared'
import { cols, doc, now } from '@/lib/firestore'
import { resizeImage, uploadImage } from '@/lib/cloudinary'

const userRef = (uid: string) => doc(cols.users, uid)

export async function saveBasics(uid: string, v: BasicsInput, photoURL?: string | null) {
  await updateDoc(userRef(uid), {
    ...v,
    ...(photoURL !== undefined ? { photoURL } : {}),
    onboardingStep: 1,
    searchTokens: tokenize(v.displayName, v.department, v.bio),
    updatedAt: now(),
  })
}

export async function saveTags(uid: string, v: TagsInput, me: Pick<User, 'displayName' | 'department' | 'bio'>) {
  await updateDoc(userRef(uid), {
    ...v,
    onboardingStep: 2,
    searchTokens: tokenize(
      me.displayName,
      me.department,
      me.bio,
      v.skills.map((s) => s.tag),
      v.interests,
      v.canTeach,
      v.careerGoals,
    ),
    updatedAt: now(),
  })
}

export async function saveAvailability(uid: string, v: AvailabilityStepInput) {
  await updateDoc(userRef(uid), { ...v, onboardingStep: 3, profileComplete: true, updatedAt: now() })
}

export async function updatePrivacy(uid: string, privacy: User['privacy']) {
  await updateDoc(userRef(uid), { privacy, updatedAt: now() })
}

export async function uploadAvatar(file: File) {
  const blob = await resizeImage(file, 512)
  return uploadImage(blob, 'avatars')
}

export async function setPhoto(uid: string, photoURL: string | null) {
  await updateDoc(userRef(uid), { photoURL, updatedAt: now() })
}
