import { Request, NextFunction } from 'express';
import { RES_MESSAGE, RES_STATUS, STATUS_CODE } from '../common/statusMessageCode';
import Handler from '../common/handler';
import { Users } from '../models/users';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

const handleAuthorizationShots = async (req: Request, res: any, next: NextFunction) => {

    try {

        const find_user = await Users.findOne({ where: { email: 'shots.ud@gmail.com' }, raw: true })
        req.userId = find_user?.id;

    } catch (err: any) {
        return res.status(STATUS_CODE.EC401).json(Handler.Error(RES_STATUS.E2, STATUS_CODE.EC401, RES_MESSAGE.EM500));
    }

    next();
};

export default handleAuthorizationShots;
