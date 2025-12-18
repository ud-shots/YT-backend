export const STATUS_CODE = {

  EC500: 500, //Internal server error
  EC100: 100, //Continue
  EC200: 200, //Success
  EC401: 401, //Unauthorized
  EC403: 403,
  EC409: 409, //Conflict
  EC201: 201, //Record Created
  EC400: 400, //Bad Request
  EC204: 204, //No content
  EC422: 422, //Unprocessable Content
  EC404: 404, //Payment Failed
};

export const RES_STATUS = {
  E1: true,
  E2: false
};
export const RES_MESSAGE = {
  EM500: 'Something went wrong !! please try again later',
  EM200: 'Data Fetched Successfully!',
  EM208: 'Data Update Successfully!',
  EM210: 'Data Deleted Successfully!',
  EM400: 'Bad Request',
  EM422: 'Unprocessable Content',
  EM410: 'Order Data Not Found',
  EM204: 'Record Not Found!',
  EM409: 'File Not Uploaded. Try Again!',
  EM401: 'Authorization Token Missing!',
  EM402 : 'Authorization Token Expired!'
};