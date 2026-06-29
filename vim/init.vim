set nocompatible
syntax enable
filetype plugin indent on

let mapleader = ' '

set number
set history=500
set hidden
set autoread
set scrolloff=7
set wildmenu
set wildignore=*.o,*~,*.pyc,*/.git/*,*/.hg/*,*/.svn/*,*/.DS_Store
set ruler
set cmdheight=1
set backspace=eol,start,indent
set whichwrap+=<,>,h,l
set ignorecase
set smartcase
set incsearch
set hlsearch
set lazyredraw
set magic
set showmatch
set matchtime=2
set noerrorbells
set novisualbell
if exists('&t_vb')
  set t_vb=
endif
set encoding=utf-8
set fileformats=unix,dos,mac
set nobackup
set nowritebackup
set noswapfile
set expandtab
set smarttab
set tabstop=2
set shiftwidth=2
set linebreak
set textwidth=500
set autoindent
set smartindent
set wrap
set laststatus=2
set clipboard=unnamed
set foldcolumn=1

function! HasPaste() abort
  return &paste ? 'PASTE MODE  ' : ''
endfunction

set statusline=\ %{HasPaste()}%F%m%r%h\ %w\ \ CWD:\ %r%{getcwd()}%h\ \ Line:\ %l\ \ Column:\ %c

command! W execute 'write !sudo tee % > /dev/null' | edit!

inoremap jj <Esc>
nnoremap <leader>w :write!<CR>
nnoremap <silent> <leader><Space> :nohlsearch<CR>
nnoremap <silent> <leader><CR> :nohlsearch<CR>
nnoremap <C-j> <C-W>j
nnoremap <C-k> <C-W>k
nnoremap <C-h> <C-W>h
nnoremap <C-l> <C-W>l
nnoremap <leader>l :bnext<CR>
nnoremap <leader>h :bprevious<CR>
nnoremap <leader>ba :bufdo bdelete<CR>
nnoremap <leader>tn :tabnew<CR>
nnoremap <leader>to :tabonly<CR>
nnoremap <leader>tc :tabclose<CR>
nnoremap <leader>tm :tabmove 
nnoremap <leader>t<leader> :tabnext<CR>
nnoremap <leader>te :tabedit <C-r>=escape(expand('%:p:h'), ' ')<CR>/
nnoremap <leader>cd :cd %:p:h<CR>:pwd<CR>
nnoremap <leader>ss :setlocal spell!<CR>
nnoremap <leader>sn ]s
nnoremap <leader>sp [s
nnoremap <leader>sa zg
nnoremap <leader>s? z=
nnoremap <leader>q :edit ~/buffer<CR>
nnoremap <leader>x :edit ~/buffer.md<CR>
nnoremap <leader>pp :setlocal paste!<CR>
nnoremap <M-j> mz:m+<CR>`z
nnoremap <M-k> mz:m-2<CR>`z
vnoremap <M-j> :m'>+<CR>`<my`>mzgv`yo`z
vnoremap <M-k> :m'<-2<CR>`>my`<mzgv`yo`z

let g:lasttab = 1
nnoremap <leader>tl :execute 'tabnext ' . g:lasttab<CR>

function! CleanExtraSpaces() abort
  let cursor = getpos('.')
  let search = getreg('/')
  silent! %s/\s\+$//e
  call setpos('.', cursor)
  call setreg('/', search)
endfunction

function! s:close() abort
  let current = bufnr('%')
  let alternate = bufnr('#')

  if buflisted(alternate)
    buffer #
  else
    bnext
  endif

  if bufnr('%') == current
    new
  endif

  if buflisted(current)
    execute 'bdelete! ' . current
  endif
endfunction

command! Bclose call <SID>close()
nnoremap <leader>bd :Bclose<CR>:tabclose<CR>gT

function! s:visual() abort
  let saved = @"
  normal! vgvy
  let pattern = escape(@", "\\/.*'$^~[]")
  let pattern = substitute(pattern, "\n$", '', '')
  let @/ = pattern
  let @" = saved
endfunction

vnoremap <silent> * :<C-u>call <SID>visual()<CR>/<C-R>=@/<CR><CR>
vnoremap <silent> # :<C-u>call <SID>visual()<CR>?<C-R>=@/<CR><CR>

augroup dot
  autocmd!
  autocmd FocusGained,BufEnter * silent! checktime
  autocmd TabLeave * let g:lasttab = tabpagenr()
  autocmd BufReadPost * if line("'\"") > 1 && line("'\"") <= line('$') | execute "normal! g'\"" | endif
  autocmd BufWritePre *.txt,*.js,*.py,*.wiki,*.sh,*.coffee call CleanExtraSpaces()
augroup END

