import { plainToInstance, ClassConstructor } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { sanitize } from "class-sanitizer";
import Handler from "../common/handler";
import { RES_STATUS, STATUS_CODE } from "../common/statusMessageCode";

function dtoValidationMiddleware( type: ClassConstructor<any>, skipMissingProperties = false ) {
  return async (req:any, res:any, next:any) => {
    try {
      const request = req.body || req.query || req.params || {};
      const dtoObj = plainToInstance(type, request);
      const errors = await validate(dtoObj, { skipMissingProperties });

      if (errors.length > 0) {
        const dtoErrors = errors.map((error: ValidationError) => extractErrorMessages(error)).flat().join(", ");
        return res.status(STATUS_CODE.EC400).send(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC400, dtoErrors));
      }

      sanitize(dtoObj);
      req.body = dtoObj;

      next();
    } catch (error: any) {
      // console.error("Validation middleware error:", error);
      return res.status(STATUS_CODE.EC500).send(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC500, error.message));
    }
  };
}

function extractErrorMessages(error: ValidationError): string[] {
  const messages: string[] = Object.values(error.constraints || {}) as string[];
  if (error.children?.length) {
    for (const child of error.children) {
      messages.push(...extractErrorMessages(child));
    }
  }
  return messages;
}

export default dtoValidationMiddleware;