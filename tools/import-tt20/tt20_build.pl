#!/usr/bin/perl
# Dựng data/tt20.json từ bảng 3 (Phụ lục I) của TT 20/2022/TT-BYT (docx).
# Mỗi dòng bảng (một đường dùng) = một bản ghi. Ô gộp dọc (STT, tên, ghi chú) được chép xuống các dòng tiếp nối.
# Giữ nguyên văn chữ; đoạn văn trong ô nối bằng "\n".
use strict; use warnings; use utf8; use JSON::PP;
binmode STDOUT, ':utf8'; binmode STDERR, ':utf8';
my ($rows) = @ARGV;
open my $fh, '<:raw', $rows or die $!;
my (@recs, @problems, $group, $sub, $subBase, %prev, @pl2rows);
my $TIER = [qw(c4 c5 c6 c7)];
my %ANNEX = (
  I  => 'PHỤ LỤC I. DANH MỤC THUỐC HÓA DƯỢC, SINH PHẨM THUỘC PHẠM VI ĐƯỢC HƯỞNG CỦA NGƯỜI THAM GIA BẢO HIỂM Y TẾ',
  II => 'PHỤ LỤC II. DANH MỤC THUỐC PHÓNG XẠ VÀ CHẤT ĐÁNH DẤU THUỘC PHẠM VI ĐƯỢC HƯỞNG CỦA NGƯỜI THAM GIA BẢO HIỂM Y TẾ',
);
while (my $line = <$fh>) {
  my $d = decode_json($line);
  if ($d->{t} == 4 && $d->{r} > 2) { push @pl2rows, $d; next; }   # bảng 4 = Phụ lục II
  next unless $d->{t} == 3 && $d->{r} > 2;   # bảng 3 = Phụ lục I; bỏ 2 dòng tiêu đề bảng
  my @c = @{ $d->{cells} };
  if (@c != 10) {                            # dòng tiêu đề nhóm (4 hoặc 9 ô)
    my ($h) = grep { $_ ne '' } map { $_->{text} } @c;
    next unless defined $h;
    if ($h =~ /^\d+\.\s/) { $group = $h; $sub = undef; $subBase = undef; }
    elsif ($h =~ /^\d+\.\d+/) { $sub = $h; $subBase = $h; }
    # Tiêu đề không đánh số (vd "Thuốc điều trị lao kháng thuốc") = tiểu mục của phân nhóm hiện tại
    else { $sub = (defined $subBase ? "$subBase › " : '') . $h; print STDERR "Tiểu mục không đánh số R$d->{r}: $sub\n"; }
    next;
  }
  my %r;
  # Cột 1, 2, 8 có thể gộp dọc: dòng tiếp nối lấy giá trị của dòng mở vùng gộp
  for my $k ([0, 'stt'], [1, 'name'], [7, 'note']) {
    my ($i, $key) = @$k;
    if ($c[$i]{vmerge} eq 'cont') { $r{$key} = $prev{$key}; $r{$key . 'Merged'} = 1; }
    else { $r{$key} = $c[$i]{text}; $prev{$key} = $c[$i]{text}; }
  }
  $r{route} = $c[2]{text};
  my @tiers;
  for my $j (0 .. 3) {
    my $v = $c[3 + $j]{text};
    push @tiers, $TIER->[$j] if $v eq '+';
    push @problems, "Ô hạng lạ STT $r{stt}: [$v]" if $v ne '+' && $v ne '';
  }
  push @problems, "Ô thừa có chữ STT $r{stt}" if $c[8]{text} ne '' || $c[9]{text} ne '';
  my $o = { annex => 'I', stt => $r{stt}, name => $r{name}, route => $r{route}, tiers => \@tiers, group => $group };
  $o->{subgroup} = $sub if defined $sub;
  $o->{note} = $r{note} if $r{note} ne '';
  $o->{noteShared} = JSON::PP::true if $r{noteMerged} && $r{note} ne '';
  push @recs, $o;
}
# Kiểm tra: STT tăng liên tục (dòng tiếp nối cùng STT), không thiếu tên/đường dùng, có ít nhất 1 hạng
# Hạng bệnh viện theo bản gốc scan 2022 (người dùng chọn 2026-10-28): docx ghi nhiều hạng hơn ở 2 dòng này.
# Đã đối chiếu tự động 1.133 dòng với bản scan; xem ảnh từng dòng lệch.
my %SCAN_OVERRIDE = (961 => { name => 'Omalizumab', tiers => ['c4'], docx => 'c4,c5' },
                     967 => { name => 'Tiotropium', tiers => [qw(c4 c5 c6)], docx => 'c4,c5,c6,c7' });
for my $stt (keys %SCAN_OVERRIDE) {
  my @hit = grep { $_->{stt} eq $stt } @recs;
  my $ov = $SCAN_OVERRIDE{$stt};
  die "Override STT $stt: cần đúng 1 dòng tên $ov->{name}\n" unless @hit == 1 && $hit[0]{name} eq $ov->{name};
  die "Override STT $stt: hạng docx đã đổi (" . join(',', @{ $hit[0]{tiers} }) . ")\n" unless join(',', @{ $hit[0]{tiers} }) eq $ov->{docx};
  $hit[0]{tiers} = $ov->{tiers};
  print STDERR "Áp hạng bản gốc cho STT $stt $ov->{name}: " . join(',', @{ $ov->{tiers} }) . " (docx: $ov->{docx})\n";
}

# STT nhỏ hơn số lớn nhất đã gặp = văn bản nhắc lại thuốc đã có (phải trùng STT và tên trước đó)
my ($last, $max, %nameOf) = ('', 0);
for my $o (@recs) {
  if ($o->{stt} ne $last) {
    if ($o->{stt} !~ /^\d+$/) { push @problems, "STT không phải số: $o->{stt}"; }
    elsif ($o->{stt} == $max + 1) { $max = $o->{stt}; $nameOf{$o->{stt}} = $o->{name}; }
    elsif ($o->{stt} <= $max && defined $nameOf{$o->{stt}}) {
      push @problems, "STT $o->{stt} nhắc lại nhưng khác tên: $o->{name} / $nameOf{$o->{stt}}" if $nameOf{$o->{stt}} ne $o->{name};
      print STDERR "Nhắc lại STT $o->{stt} ($o->{name}) trong: " . ($o->{subgroup} // $o->{group}) . "\n";
    }
    else { push @problems, "STT nhảy: $last -> $o->{stt}"; }
    $last = $o->{stt};
  }
  $o->{repeat} = JSON::PP::true if $o->{stt} =~ /^\d+$/ && $o->{stt} < $max && $nameOf{$o->{stt}} && $o != (grep { $_->{stt} eq $o->{stt} } @recs)[0];
  push @problems, "Thiếu tên STT $o->{stt}" if $o->{name} eq '';
  push @problems, "Thiếu đường dùng STT $o->{stt}" if $o->{route} eq '';
  push @problems, "Không có hạng nào STT $o->{stt} ($o->{route})" unless @{ $o->{tiers} };
}
print STDERR "Phụ lục I – dòng: " . scalar(@recs) . ", STT lớn nhất: $max (đủ 1..$max: " . (scalar(keys %nameOf) == $max ? 'có' : 'KHÔNG') . ")\n";

# Phụ lục II: 5 cột (STT, tên, đường dùng, dạng dùng, đơn vị); không phân hạng bệnh viện.
# STT và tên có thể gộp dọc khi một thuốc có nhiều đường dùng.
my ($last2, $max2, %p2) = ('', 0);
for my $d (@pl2rows) {
  my @c = @{ $d->{cells} };
  if (@c != 5) { push @problems, "PL II R$d->{r}: " . scalar(@c) . " ô"; next; }
  for my $k ([0, 'stt'], [1, 'name']) {
    my ($i, $key) = @$k;
    if ($c[$i]{vmerge} eq 'cont') { $c[$i]{text} = $p2{$key}; } else { $p2{$key} = $c[$i]{text}; }
  }
  my $o = { annex => 'II', stt => $c[0]{text}, name => $c[1]{text}, route => $c[2]{text}, form => $c[3]{text}, unit => $c[4]{text},
            tiers => [], group => $ANNEX{II} };
  for my $f (qw(stt name route form unit)) { push @problems, "PL II STT $o->{stt}: thiếu $f" if $o->{$f} eq ''; }
  if ($o->{stt} ne $last2) {
    push @problems, "PL II STT nhảy: $last2 -> $o->{stt}" unless $o->{stt} =~ /^\d+$/ && $o->{stt} == $max2 + 1;
    $max2 = $o->{stt}; $last2 = $o->{stt};
  }
  push @recs, $o;
}
print STDERR "Phụ lục II – dòng: " . scalar(@pl2rows) . ", STT lớn nhất: $max2\n";
print STDERR "Tổng dòng: " . scalar(@recs) . ", lỗi: " . scalar(@problems) . "\n";
print STDERR "$_\n" for @problems[0 .. ($#problems < 30 ? $#problems : 29)];

# So sánh số ở trên làm JSON::PP xuất STT lúc là số lúc là chuỗi: ép về chuỗi cho thống nhất
$_->{stt} = '' . $_->{stt} for @recs;

my $out = {
  version => '1.1.0', updated => '2026-10-28', sample => JSON::PP::false,
  source => 'Bộ Y tế. Thông tư số 20/2022/TT-BYT ngày 31 tháng 12 năm 2022 ban hành Danh mục và tỷ lệ, điều kiện thanh toán đối với thuốc hóa dược, sinh phẩm, thuốc phóng xạ và chất đánh dấu thuộc phạm vi được hưởng của người tham gia bảo hiểm y tế. Phụ lục I và Phụ lục II. Hà Nội: Bộ Y tế; 2022.',
  annexes => \%ANNEX,
  annexRules => {
    II => 'Thuốc phóng xạ và chất đánh dấu trong Danh mục thuốc quy định tại Phụ lục II không theo phân hạng bệnh viện và chỉ được sử dụng tại các cơ sở khám bệnh, chữa bệnh được cấp có thẩm quyền cho phép thực hiện việc chẩn đoán, điều trị bằng thuốc phóng xạ và chất đánh dấu.'
  },
  extraction => 'Trích tự động bảng Phụ lục I và Phụ lục II từ tệp 20_2022_TT-BYT_548898.docx do người dùng cung cấp; giữ nguyên văn. Mỗi dòng = một đường dùng; STT, tên và ghi chú của ô gộp dọc được chép xuống các đường dùng cùng thuốc. Hạng bệnh viện (cột 4–7) đã đối chiếu toàn bộ với bản scan có chữ ký TT20.pdf: 1.131/1.133 dòng khớp; 2 dòng docx ghi nhiều hạng hơn bản gốc (STT 961 Omalizumab: docx c4,c5; STT 967 Tiotropium: docx c4,c5,c6,c7) được lấy theo bản gốc 2022. Phụ lục II (59 thuốc, 61 dòng): đã đối chiếu bằng mắt toàn bộ tên, đường dùng, dạng dùng, đơn vị với bản scan trang 79–81, khớp hoàn toàn.',
  fields => { annex => 'Phụ lục (I hoặc II)', stt => 'Cột 1', name => 'Cột 2 – Tên hoạt chất (PL I) / Tên thuốc phóng xạ và chất đánh dấu (PL II)', route => 'Cột 3 – Đường dùng, dạng dùng (PL I) / Đường dùng (PL II)', tiers => 'PL I cột 4–7 – Hạng bệnh viện', note => 'PL I cột 8 – Ghi chú (điều kiện, tỷ lệ thanh toán)', form => 'PL II cột 4 – Dạng dùng', unit => 'PL II cột 5 – Đơn vị', group => 'Nhóm thuốc (PL I) / tên Phụ lục II', subgroup => 'Phân nhóm' },
  tierLabels => { c4 => 'Hạng đặc biệt, I', c5 => 'Hạng II', c6 => 'Hạng III, IV', c7 => 'Trạm y tế xã' },
  tierDefs => {
    c4 => 'Bệnh viện hạng đặc biệt và hạng I sử dụng các thuốc quy định tại cột 4;',
    c5 => 'Bệnh viện hạng II sử dụng các thuốc quy định tại cột 5;',
    c6 => 'Bệnh viện hạng III và hạng IV, bao gồm cả phòng khám đa khoa thuộc bệnh viện đa khoa hoặc thuộc trung tâm y tế quận, huyện, thị xã, thành phố trực thuộc tỉnh thành phố trực thuộc trung ương, phòng khám đa khoa, phòng khám chuyên khoa, nhà hộ sinh tư nhân đã được cơ quan nhà nước có thẩm quyền phân tuyến chuyên môn kỹ thuật tương đương tuyến III sử dụng các thuốc quy định tại cột 6;',
    c7 => 'Phòng khám đa khoa, phòng khám chuyên khoa, nhà hộ sinh tư nhân chưa được phân tuyến chuyên môn kỹ thuật; trạm y tế xã, phường, thị trấn, y tế cơ quan và tương đương (sau đây gọi chung là trạm y tế xã) sử dụng các thuốc quy định tại cột 7;'
  },
  records => \@recs
};
print JSON::PP->new->canonical(1)->encode($out);
