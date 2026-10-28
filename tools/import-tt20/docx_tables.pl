#!/usr/bin/perl
# Đọc mọi bảng trong word/document.xml -> JSON Lines: {"t":bảng,"r":dòng,"cells":[{"text","span","vmerge"}]}
# Đoạn văn trong một ô nối bằng "\n"; giữ nguyên chữ (chỉ giải mã thực thể XML).
use strict; use warnings; use utf8; use JSON::PP;
binmode STDOUT, ':utf8';
my $xml = do { local $/; open my $fh, '<:utf8', $ARGV[0] or die $!; <$fh> };
my $json = JSON::PP->new->canonical(1);
sub dec { my $s = shift; $s =~ s/&lt;/</g; $s =~ s/&gt;/>/g; $s =~ s/&quot;/"/g; $s =~ s/&apos;/'/g; $s =~ s/&amp;/&/g; $s }
sub celltext {
  my $c = shift;
  my @paras;
  while ($c =~ m{<w:p[ >](.*?)</w:p>}gs) {
    my $p = $1; my $t = '';
    while ($p =~ m{<w:t(?: [^>]*)?>(.*?)</w:t>|<w:t/>|(<w:tab/>)|(<w:br/>)}gs) {
      if (defined $1) { $t .= dec($1) } elsif (defined $2) { $t .= "\t" } elsif (defined $3) { $t .= "\n" }
    }
    push @paras, $t;
  }
  my $s = join "\n", @paras;
  $s =~ s/[ \t]+/ /g; $s =~ s/ *\n */\n/g; $s =~ s/^\s+|\s+$//g;
  return $s;
}
my $t = 0;
# Bảng lồng nhau hiếm gặp trong văn bản này; bỏ qua lồng nhau
while ($xml =~ m{<w:tbl>(.*?)</w:tbl>}gs) {
  my $tbl = $1; $t++; my $r = 0;
  while ($tbl =~ m{<w:tr[ >](.*?)</w:tr>}gs) {
    my $tr = $1; $r++; my @cells;
    while ($tr =~ m{<w:tc>(.*?)</w:tc>}gs) {
      my $tc = $1;
      my ($span) = $tc =~ m{<w:gridSpan w:val="(\d+)"}; $span //= 1;
      # Word ghi "<w:vMerge />" (có dấu cách) cho ô tiếp nối của vùng gộp dọc
      my $vm = $tc =~ m{<w:vMerge w:val="restart"\s*/?>} ? 'restart' : ($tc =~ m{<w:vMerge\s*/>|<w:vMerge w:val="continue"} ? 'cont' : '');
      push @cells, { text => celltext($tc), span => $span + 0, vmerge => $vm };
    }
    print $json->encode({ t => $t, r => $r, cells => \@cells }), "\n";
  }
}
