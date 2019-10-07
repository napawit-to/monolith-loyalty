import Router from "../common/router";

import loyalty from "./loyalty";

const router = Router();

router.use("/v1", loyalty);

export default router;
