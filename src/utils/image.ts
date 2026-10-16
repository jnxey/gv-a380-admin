import type { UploadUserFile } from 'element-plus';
import { ShopImageLimit, ShopImageMime } from './constants';
import { isEmpty } from './tools';

/**
 * 宽度超过上限时按比例缩小。不超过上限的原样返回。
 */
export async function limitImageWidth(file: File): Promise<File> {
  // 按拍摄方向解码，拿到实际显示出来的宽高。
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    void error;
    return file;
  }
  if (image.width <= ShopImageLimit.MAX_WIDTH) {
    image.close();
    return file;
  }
  // 只收宽度，高度按比例变化，不放大。
  const targetWidth = ShopImageLimit.MAX_WIDTH;
  const targetHeight = Math.max(1, Math.round((image.height * targetWidth) / image.width));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (context === null) {
    image.close();
    return file;
  }
  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => {
    const quality = file.type === ShopImageMime.PNG ? undefined : 0.8;
    canvas.toBlob(resolve, file.type, quality);
  });
  if (blob === null) {
    return file;
  }
  return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
}

/**
 * 把上传列表里的原图换成压缩后的文件，预览地址一起换掉。
 */
export function replaceUploadRawFile(fileList: UploadUserFile[], file: File): void {
  const fileUid = (file as File & { uid?: number }).uid;
  if (fileUid === undefined) {
    return;
  }
  const currentFile = fileList.find((fileItem) => fileItem.uid === fileUid);
  if (isEmpty(currentFile) || currentFile.raw === file) {
    return;
  }
  if (!isEmpty(currentFile.url) && currentFile.url.startsWith('blob:')) {
    URL.revokeObjectURL(currentFile.url);
  }
  currentFile.raw = file as UploadUserFile['raw'];
  currentFile.url = URL.createObjectURL(file);
  currentFile.size = file.size;
}
