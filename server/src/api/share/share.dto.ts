// export interface IPublicShare extends Document {
//   _id: Types.ObjectId;
//   resource: Schema.Types.ObjectId;
//   owner: Schema.Types.ObjectId;
//   link: string; // unique link
//   permission: IPublicSharePermission;
//   allowDownload: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface IUserShare extends Document {
//   _id: Types.ObjectId;
//   resource: Schema.Types.ObjectId;
//   owner: Schema.Types.ObjectId;
//   sharedWith: {
//     userId: Schema.Types.ObjectId;
//     permission: IUserSharePermission;
//     allowDownload: boolean;
//   }[];
//   createdAt: Date;
//   updatedAt: Date;
// }

export enum IPublicSharePermission {
  RESTRICTED = 'restricted',
  VIEWER = 'viewer',
  EDITOR = 'editor', //rename the folder, delete folder, move folder within the folder and rename the file, delete file, move file within the folder
}

export enum IUserSharePermission {
  VIEWER = 'viewer',
  EDITOR = 'editor', //rename the folder, delete folder, move folder within the folder and rename the file, delete file, move file within the folder
}

export interface PublicShareResponseDto {
  id: string;
  resource: string;
  owner: string;
  link: string;
  permission: IPublicSharePermission;
  allowDownload: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface UserShareResponseDto {
  id: string;
  resource: string;
  owner: string;
  sharedWith: {
    userId: string;
    permission: IUserSharePermission;
    allowDownload: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}