// Completions di base disponibili anche per i linguaggi legacy, che non
// espongono un language server. CodeMirror le unisce alle parole già presenti
// nel blocco; le voci più riconoscibili sono marcate come keyword, le altre
// come funzioni/tipi così il popup resta facile da scorrere.
const entries = (type, words) => words.trim().split(/\s+/).map((label) => ({ label, type }))

const JAVASCRIPT_MEMBERS = [
  ...entries('method', 'at concat copyWithin entries every fill filter find findIndex findLast findLastIndex flat flatMap forEach includes indexOf join keys lastIndexOf map pop push reduce reduceRight reverse shift slice some sort splice unshift values'),
  ...entries('method', 'charAt charCodeAt codePointAt endsWith startsWith match matchAll padEnd padStart repeat replace replaceAll search split substring substr toLowerCase toUpperCase trim trimEnd trimStart'),
  ...entries('method', 'then catch finally resolve reject all allSettled any race'),
  ...entries('method', 'hasOwn is keys values entries assign create defineProperty freeze seal fromEntries'),
  ...entries('method', 'get set has delete clear add'),
  ...entries('property', 'length size constructor prototype')
]

const COMMON = {
  javascript: [
    ...entries('keyword', 'const let var function async await return import export from default class extends new this if else switch case break continue for of in while do try catch finally throw typeof instanceof delete yield'),
    ...entries('type', 'Array Object String Number Boolean Map Set WeakMap WeakSet Date RegExp Promise Error Symbol BigInt'),
    ...entries('function', 'console document window fetch setTimeout setInterval parseInt parseFloat JSON Math Object.keys Object.values Object.entries Array.from'),
    ...JAVASCRIPT_MEMBERS
  ],
  typescript: [
    ...entries('keyword', 'const let var function async await return import export from default class extends implements interface type enum namespace declare abstract public private protected readonly static keyof infer satisfies as is in of if else switch case for while try catch finally throw'),
    ...entries('type', 'string number boolean object unknown never any void null undefined Array Record Partial Required Pick Omit Readonly Promise Map Set Date Error'),
    ...entries('function', 'console fetch setTimeout JSON.parse JSON.stringify Object.keys Object.values Object.entries Array.from'),
    ...JAVASCRIPT_MEMBERS
  ],
  python: [
    ...entries('keyword', 'def class import from as return async await lambda if elif else match case for while break continue try except finally raise with yield pass global nonlocal assert del in is not and or'),
    ...entries('type', 'str int float bool list dict set tuple bytes object type Exception None True False'),
    ...entries('function', 'print len range enumerate zip map filter sorted sum min max open input isinstance hasattr getattr setattr super')
  ],
  bash: [
    ...entries('keyword', 'if then elif else fi for in do done while until case esac function select time coproc'),
    ...entries('function', 'echo printf cd pwd export source alias unalias local readonly set unset test read mapfile grep find sed awk xargs curl wget jq sort uniq head tail chmod mkdir cp mv')
  ],
  json: entries('keyword', 'true false null'),
  yaml: entries('keyword', 'true false null yes no on off'),
  xml: [
    ...entries('type', 'html head body main section article header footer nav div span p a button input form label select option textarea table thead tbody tr th td ul ol li script style link meta img canvas'),
    ...entries('property', 'class id href src alt title type name value placeholder disabled checked selected role aria-label data-testid')
  ],
  css: [
    ...entries('property', 'display position top right bottom left width height min-width max-width min-height max-height margin padding gap color background background-color border border-radius box-shadow opacity overflow overflow-x overflow-y font font-family font-size font-weight line-height text-align text-decoration white-space flex flex-direction flex-wrap flex-grow flex-shrink align-items align-content justify-content grid grid-template-columns grid-template-rows transform transition cursor z-index content visibility'),
    ...entries('keyword', 'block inline inline-block flex grid none auto relative absolute fixed sticky hidden visible inherit initial unset')
  ],
  scss: [
    ...entries('keyword', '@use @forward @import @mixin @include @extend @function @return @if @else @each @for @while @media'),
    ...entries('function', 'map-get nth length darken lighten mix rgba calc min max clamp var'),
    ...entries('property', 'display position width height margin padding gap color background border border-radius box-shadow overflow font-size font-weight flex grid transform transition')
  ],
  sql: [
    ...entries('keyword', 'SELECT FROM WHERE JOIN INNER LEFT RIGHT FULL ON AS DISTINCT GROUP BY HAVING ORDER ASC DESC LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP INDEX PRIMARY KEY FOREIGN REFERENCES UNIQUE NOT NULL DEFAULT CHECK UNION ALL WITH CASE WHEN THEN ELSE END EXISTS IN LIKE BETWEEN IS TRANSACTION COMMIT ROLLBACK'),
    ...entries('function', 'COUNT SUM AVG MIN MAX COALESCE NULLIF CAST ROUND LOWER UPPER LENGTH SUBSTRING NOW DATE EXTRACT ROW_NUMBER RANK')
  ],
  markdown: [
    ...entries('keyword', '# ## ### #### ##### ###### ``` - * > ---'),
    ...entries('type', '[link](url) ![image](url) **bold** _italic_ `code` - [ ] - [x]')
  ],
  php: [
    ...entries('keyword', 'function fn class interface trait extends implements namespace use public private protected static abstract final const return if elseif else switch case foreach for while do try catch finally throw match yield echo include require new clone instanceof'),
    ...entries('type', 'string int float bool array object callable iterable mixed null self parent'),
    ...entries('function', 'count strlen array_map array_filter array_reduce array_keys array_values in_array json_encode json_decode sprintf isset empty')
  ],
  ruby: [
    ...entries('keyword', 'def class module end do if elsif else unless case when while until for in begin rescue ensure raise return yield require include extend attr_reader attr_writer attr_accessor self super nil true false'),
    ...entries('function', 'puts print p each map select reject reduce find sort_by key? include? empty? length size to_s to_i to_a')
  ],
  rust: [
    ...entries('keyword', 'fn let mut const static struct enum trait impl type mod use pub crate self Self super async await move match if else loop while for in break continue return where as ref unsafe extern dyn'),
    ...entries('type', 'String str bool char i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 Vec Option Result Box Rc Arc HashMap HashSet'),
    ...entries('function', 'println! print! format! vec! panic! assert! dbg! Some None Ok Err unwrap expect clone iter into_iter collect map filter')
  ],
  go: [
    ...entries('keyword', 'package import func var const type struct interface map chan go defer select case switch if else for range break continue return fallthrough'),
    ...entries('type', 'string bool byte rune int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 uintptr float32 float64 complex64 complex128 error any'),
    ...entries('function', 'make new len cap append copy delete close panic recover print println fmt.Println fmt.Printf errors.New')
  ]
}

const CLIKE = [
  ...entries('keyword', 'class interface struct enum namespace using package import public private protected static final const abstract virtual override new this super return if else switch case for foreach while do break continue try catch finally throw throws synchronized volatile'),
  ...entries('type', 'void bool boolean char byte short int long float double string String Object List ArrayList Map HashMap Set HashSet Optional'),
  ...entries('function', 'print println printf size length add remove get set contains equals toString')
]

export function codeCompletionsFor(language) {
  if (['c', 'cpp', 'csharp', 'java'].includes(language)) return CLIKE
  return COMMON[language] || []
}

export function codeMemberCompletionsFor(language) {
  return ['javascript', 'typescript'].includes(language) ? JAVASCRIPT_MEMBERS : []
}
