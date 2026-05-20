import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';
import localeData from 'dayjs/plugin/localeData';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';

dayjs.extend(localeData);
dayjs.extend(updateLocale);
dayjs.extend(utc);

export default dayjs;
