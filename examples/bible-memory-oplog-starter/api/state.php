<?php
require __DIR__.'/lib.php';
$user_id = current_user_id();

$since = isset($_GET['since']) ? (int)$_GET['since'] : 0; // server seq filter
$format = $_GET['format'] ?? 'json';

$pdo = db();
$stmt = $pdo->prepare('SELECT seq, ts_server, ts_client, data_json
                       FROM ops WHERE user_id=? AND entity="review" AND seq > ? ORDER BY seq ASC');
$stmt->execute([$user_id, $since]);
$rows = $stmt->fetchAll();

$totals = ['total'=>0, 'byType'=>[]];
$perVerse = []; // verseId => ['total'=>, 'byType'=>[], 'lastReviewedAt'=>ms]

foreach ($rows as $r) {
  $data = json_decode($r['data_json'], true);
  if (!is_array($data) || !isset($data['verseId'])) continue;
  $verse = $data['verseId'];
  $type = $data['reviewType'] ?? 'unknown';
  $t = (int)($r['ts_server'] ?? $r['ts_client'] ?? 0);

  $totals['total']++;
  $totals['byType'][$type] = ($totals['byType'][$type] ?? 0) + 1;

  if (!isset($perVerse[$verse])) $perVerse[$verse] = ['total'=>0,'byType'=>[],'lastReviewedAt'=>0];
  $perVerse[$verse]['total']++;
  $perVerse[$verse]['byType'][$type] = ($perVerse[$verse]['byType'][$type] ?? 0) + 1;
  if ($t > $perVerse[$verse]['lastReviewedAt']) $perVerse[$verse]['lastReviewedAt'] = $t;
}

// sort verses by lastReviewedAt desc
uksort($perVerse, function($a, $b) use ($perVerse) {
  return ($perVerse[$b]['lastReviewedAt'] <=> $perVerse[$a]['lastReviewedAt']);
});

$cursor = (int)$pdo->query("SELECT COALESCE(MAX(seq),0) FROM ops WHERE user_id=".$pdo->quote($user_id))->fetchColumn();
$result = [
  'cursor' => $cursor,
  'since' => $since,
  'totals' => $totals,
  'perVerse' => $perVerse,
];

if ($format === 'html') {
  function h($s){ return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
  function fmt($ms){ if(!$ms) return '-'; $dt = new DateTimeImmutable("@".(int)floor($ms/1000)); return $dt->format('Y-m-d H:i:s'); }
  header('Content-Type: text/html; charset=utf-8');
  ?>
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Review State</title>
    <style>
      body { font-family: system-ui, Arial, sans-serif; margin: 24px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f2f2f2; }
      code { background: #f7f7f7; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Review State</h1>
    <p><strong>Cursor:</strong> <?=h($cursor)?> | <strong>Since:</strong> <?=h($since)?></p>
    <h2>Totals</h2>
    <p><strong>Total reviews:</strong> <?=h($totals['total'])?></p>
    <ul>
      <?php foreach ($totals['byType'] as $type => $count): ?>
        <li><?=h($type)?>: <?=h($count)?></li>
      <?php endforeach; ?>
    </ul>

    <h2>Per Verse</h2>
    <table>
      <thead><tr><th>Verse</th><th>Total</th><th>By Type</th><th>Last Reviewed</th></tr></thead>
      <tbody>
        <?php foreach ($perVerse as $verseId => $stats): ?>
        <tr>
          <td><?=h($verseId)?></td>
          <td><?=h($stats['total'])?></td>
          <td>
            <?php foreach ($stats['byType'] as $t => $n): ?>
              <code><?=h($t)?></code> x <?=h($n)?>&nbsp;
            <?php endforeach; ?>
          </td>
          <td><?=h(fmt($stats['lastReviewedAt']))?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </body>
  </html>
  <?php
  exit;
}
json_out($result);
