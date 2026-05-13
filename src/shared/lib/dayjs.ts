import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import localeData from 'dayjs/plugin/localeData';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(localeData);
dayjs.extend(updateLocale);

export default dayjs;
