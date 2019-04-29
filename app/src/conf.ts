import conf from '../../shared/conf'

declare var process;

export default {
    base_pathname: process.env.BASE_URL,
    ...conf,
}
