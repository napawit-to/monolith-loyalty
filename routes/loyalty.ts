import Router from "../common/router";
import App from "../app";

import {
    catalogues
} from "../controllers/loyalty-controller";
import {
    redeem
} from "../controllers/loyalty-controller";
const router = Router(() => App);

router.route("/catalogues").get(catalogues);
router.route("/redeem").post(redeem);

export default router;
